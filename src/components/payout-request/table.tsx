import * as React from 'react';
import { Table, Tag } from 'antd';
import Link from 'next/link';
import { PayoutRequestInterface } from 'src/interfaces';
import { formatDate, Breakpoint } from 'src/lib';

interface IProps {
  payouts: PayoutRequestInterface[];
  searching: boolean;
  total: number;
  pageSize: number;
  onChange(pagination, filters, sorter, extra): Function;
  role?: string;
}

const breakPoint: Breakpoint[] = ['md'];
const format = 'DD/MM/YYYY';
const PayoutRequestList = ({
  payouts,
  searching,
  total,
  pageSize,
  role,
  onChange
}: IProps) => {
  const columns = [
    {
      title: 'Pay Period',
      key: 'payPeriod',
      responsive: breakPoint,
      render: ({ fromDate, toDate } : any) => (
        <span>
          {`${formatDate(fromDate, format)} - ${formatDate(
            toDate,
            format
          )}`}
        </span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color="magenta">{status}</Tag>
    },
    {
      title: 'Date Requested',
      key: 'createdAt',
      dataIndex: 'createdAt',
      render: (createdAt: Date) => <span>{formatDate(createdAt)}</span>,
      sorter: true
    },
    {
      title: 'Payment Details',
      key: 'details',
      render: (request: PayoutRequestInterface) => (
        <Link
          href={{
            pathname:
              role === 'studio'
                ? '/studio/payout-requests/update'
                : '/account/performer/payout-requests/update',
            query: {
              // eslint-disable-next-line react/destructuring-assignment
              id: request._id,
              data: JSON.stringify(request)
            }
          }}
          as={
            role === 'studio'
              // eslint-disable-next-line react/destructuring-assignment
              ? `/studio/payout-requests/${request._id}/update`
              // eslint-disable-next-line react/destructuring-assignment
              : `/account/performer/payout-requests/${request._id}/update`
          }
        >
          <a>Click here to know more</a>
        </Link>
      )
    }
  ];
  const dataSource = payouts.map((p) => ({ ...p, key: p._id }));

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      className="table"
      pagination={{
        total,
        pageSize
      }}
      scroll={{ x: true }}
      showSorterTooltip={false}
      loading={searching}
      onChange={onChange}
    />
  );
};
PayoutRequestList.defaultProps = {
  role: ''
};
export default PayoutRequestList;
